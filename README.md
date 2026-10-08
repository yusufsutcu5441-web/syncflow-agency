# syncflow-agency

`syncflow.agency` sitesi. Uygulama (Next.js 16) **[`syncflow-web/`](syncflow-web/)** klasöründedir; komutlar orada çalışır:

```bash
cd syncflow-web
npm ci
npm run dev
```

Vercel projesi `syncflow-web` bu klasörü derler (Root Directory `syncflow-web`, dal `main`). Ayrıntılar: [syncflow-web/README.md](syncflow-web/README.md), [Vercel kılavuzu](syncflow-web/docs/vercel-next-site.md), [ADR 0013](syncflow-web/docs/adr/0013-app-moved-into-syncflow-web.md).

Eski statik site `legacy-site` dalındadır. `claude code` ve `motor_hedef.py` boş, eski dosyalardır.
