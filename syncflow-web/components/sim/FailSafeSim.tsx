'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { QueueView } from './QueueView';
import { fillText, IDLE_QUEUE, type QueueLabels, type QueueParcel, type QueueState } from './types';

/**
 * The live fail-safe queue simulator (docs/adr/0020-case-study-layer.md §3): a small state machine, not a measurement. Events leave a
 * producer, cross a primary channel and reach a business system. Block the channel and the events that reach it are accepted into a
 * durable standby queue instead of being lost; the ones already on their way to the channel are re-sent through the queue under the same
 * key, so when the channel returns the late copies are recognised and dropped (an at-least-once, idempotent delivery). Restore the
 * channel and the queue drains in order. "Lost" is computed from the model (accepted minus everything accounted for); in the model it
 * cannot be anything else than 0, and the caption on the card says that this is a model.
 *
 * The motion is CSS (a parcel's position is two custom properties and `translate` transitions between them); the timers only decide
 * where a parcel goes next. Under prefers-reduced-motion the global rule makes every transition instant. Timers are cleared on unmount.
 */
const HOP_MS = 620;
const SPAWN_GAP_MS = 520;
const DRAIN_GAP_MS = 440;
const REMOVE_MS = 700;
/** Where a waiting parcel sits in the standby queue (percent of the stage width). */
const SLOTS = [38, 44, 50, 56, 62];

type Snapshot = { parcels: QueueParcel[]; blocked: boolean; accepted: number; delivered: number; duplicates: number; scheduled: number };

const INITIAL: Snapshot = { parcels: [], blocked: false, accepted: 0, delivered: 0, duplicates: 0, scheduled: 0 };

export default function FailSafeSim({ labels }: { labels: QueueLabels }) {
  const [snap, setSnap] = useState<Snapshot>(INITIAL);
  const parcels = useRef<QueueParcel[]>([]);
  const counters = useRef({ accepted: 0, delivered: 0, duplicates: 0 });
  const blocked = useRef(false);
  const retried = useRef(0);
  const scheduled = useRef(0);
  const sequence = useRef(0);
  const timers = useRef(new Set<number>());

  const emit = useCallback(() => {
    setSnap({ parcels: parcels.current.map((p) => ({ ...p })), blocked: blocked.current, scheduled: scheduled.current, ...counters.current });
  }, []);

  const later = useCallback((run: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      run();
    }, ms);
    timers.current.add(id);
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);

  const toStandby = useCallback(
    (parcel: QueueParcel, inFlight: boolean) => {
      const slot = parcels.current.filter((p) => p.phase === 'standby').length;
      parcel.phase = 'standby';
      parcel.row = 1;
      parcel.x = SLOTS[Math.min(slot, SLOTS.length - 1)]!;
      // A parcel that was already on its way to the channel when it failed is sent again through the queue under the same key.
      if (inFlight) retried.current += 1;
      emit();
    },
    [emit],
  );

  const arrive = useCallback(
    (parcel: QueueParcel) => {
      counters.current.delivered += 1;
      parcel.phase = 'arrived';
      emit();
      later(() => {
        parcels.current = parcels.current.filter((p) => p.id !== parcel.id);
        emit();
      }, REMOVE_MS);
    },
    [emit, later],
  );

  const hop2 = useCallback(
    (parcel: QueueParcel) => {
      parcel.phase = 'hop2';
      parcel.row = 0;
      parcel.x = 90;
      emit();
      later(() => arrive(parcel), HOP_MS);
    },
    [arrive, emit, later],
  );

  const hop1 = useCallback(
    (parcel: QueueParcel) => {
      parcel.phase = 'hop1';
      parcel.row = 0;
      parcel.x = 50;
      emit();
      later(() => {
        if (parcel.phase !== 'hop1') return; // it was re-routed meanwhile
        if (blocked.current) toStandby(parcel, false);
        else hop2(parcel);
      }, HOP_MS);
    },
    [emit, hop2, later, toStandby],
  );

  const spawn = useCallback(() => {
    sequence.current += 1;
    const parcel: QueueParcel = { id: sequence.current, x: 10, row: 0, phase: 'spawn' };
    counters.current.accepted += 1;
    parcels.current = [...parcels.current, parcel];
    emit();
    later(() => (blocked.current ? toStandby(parcel, false) : hop1(parcel)), 40);
  }, [emit, hop1, later, toStandby]);

  const send = useCallback(() => {
    for (let i = 0; i < 5; i++) {
      scheduled.current += 1;
      later(() => {
        scheduled.current -= 1;
        spawn();
      }, i * SPAWN_GAP_MS);
    }
    emit();
  }, [emit, later, spawn]);

  const drain = useCallback(
    (parcel: QueueParcel) => {
      if (blocked.current || parcel.phase !== 'standby') return;
      parcel.phase = 'drain';
      parcel.row = 0;
      parcel.x = 50;
      emit();
      later(() => {
        if (blocked.current) toStandby(parcel, false);
        else hop2(parcel);
      }, HOP_MS);
    },
    [emit, hop2, later, toStandby],
  );

  const toggle = useCallback(() => {
    if (!blocked.current) {
      blocked.current = true;
      parcels.current.filter((p) => p.phase === 'hop1').forEach((p) => toStandby(p, true));
      emit();
      return;
    }
    blocked.current = false;
    // The copies that were already on the dead channel arrive late now, with keys the business system has seen: they are dropped.
    counters.current.duplicates += retried.current;
    retried.current = 0;
    parcels.current
      .filter((p) => p.phase === 'standby')
      .sort((a, b) => a.id - b.id)
      .forEach((p, i) => later(() => drain(p), i * DRAIN_GAP_MS));
    emit();
  }, [drain, emit, later, toStandby]);

  const reset = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
    parcels.current = [];
    counters.current = { accepted: 0, delivered: 0, duplicates: 0 };
    blocked.current = false;
    retried.current = 0;
    scheduled.current = 0;
    emit();
  }, [emit]);

  const waiting = snap.parcels.filter((p) => p.phase === 'standby').length;
  const inFlight = snap.parcels.filter((p) => p.phase === 'spawn' || p.phase === 'hop1' || p.phase === 'hop2' || p.phase === 'drain').length;
  const lost = snap.accepted - snap.delivered - waiting - inFlight;
  const draining = !snap.blocked && (waiting > 0 || snap.parcels.some((p) => p.phase === 'drain'));

  let status = labels.statusIdle;
  if (snap.accepted > 0) {
    if (snap.blocked) status = fillText(labels.statusBlocked, { waiting, delivered: snap.delivered });
    else if (draining) status = labels.statusDraining;
    else if (snap.delivered === snap.accepted) status = fillText(labels.statusDone, { delivered: snap.delivered, accepted: snap.accepted, lost });
    else status = labels.statusFlowing;
  }

  const state: QueueState = { ...IDLE_QUEUE, parcels: snap.parcels, blocked: snap.blocked, accepted: snap.accepted, delivered: snap.delivered, waiting, lost, duplicates: snap.duplicates, status };

  return <QueueView labels={labels} state={state} actions={{ send, toggle, reset, canSend: snap.scheduled === 0 && !draining }} />;
}
