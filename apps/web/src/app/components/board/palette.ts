/* ══════════════════════════════════════════════════════════════
   Paleta del tablero (PixiJS).

   El canvas no puede leer las variables CSS del tema, así que los
   colores se declaran aquí en hex. Están escogidos para casar con el
   tema "Cripta" del modo oscuro: piedra cálida y oro, nunca grises
   azulados — un gris frío junto al pergamino se ve como un agujero.
   ══════════════════════════════════════════════════════════════ */

export const boardPalette = {
  /** Losa de piedra bajo la rejilla. */
  gridBg: 0x241d18,
  gridBgAlpha: 0.35,

  /** Juntas entre losas. */
  gridLine: 0x6b5847,
  gridLineAlpha: 0.45,

  /** Niebla de guerra: negro cálido, no azulado. */
  fog: 0x120d0a,

  /** Sombra fuera de la línea de visión. */
  shadow: 0x120d0a,

  /** Muros: piedra tallada con arista más clara. */
  wall: 0x2b221c,
  wallStroke: 0x4a3b2e,

  /** Selección en oro — el verde esmeralda no pega en una cripta. */
  selectionRing: 0xd4a537,

  /** Contorno y texto de las fichas. */
  tokenStroke: 0xf0e4cc,
  tokenText: 0xf5ecd8,
  tokenTextShadow: 0x1a1310,
} as const;
