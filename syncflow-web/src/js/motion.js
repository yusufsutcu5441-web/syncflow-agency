// Tek içe aktarma noktası: Motion'ın (Framer Motion'ın React'sız DOM motoru) yalnızca Web Animations API
// kullanan "mini" sürümü. Pakete yalnızca animate() girer (~3,4 KB gzip); hibrit sürüm 20 KB olurdu.
// Not: Gecikmeli animasyonlarda ilk kare bekleme süresince de uygulanır (backwards fill).
// Bu yüzden aynı öğede iki gecikmeli animasyon yerine tek animasyon + `times` kullanın.
export { animate } from 'motion/mini';
