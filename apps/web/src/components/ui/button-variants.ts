import { cva } from "class-variance-authority"

// ══════════════════════════════════════════════════════════════
// Botones "herrería": rectangulares con esquinas apenas matadas,
// capitales de Cinzel con tracking amplio, y relieve por sombra
// interior (luz arriba, sombra abajo) para que parezcan metal o
// madera tallada en lugar de rectángulos planos.
// Al pulsar, el relieve se invierte: el botón se hunde.
// ══════════════════════════════════════════════════════════════
export const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center rounded-sm border bg-clip-padding",
    "font-heading text-sm font-semibold tracking-[0.08em] whitespace-nowrap uppercase",
    "transition-all outline-none select-none",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "active:not-aria-[haspopup]:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
    "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        // Lacre: la acción principal.
        default: [
          "border-primary/70 bg-primary text-primary-foreground",
          "shadow-[inset_0_1px_0_oklch(1_0_0/0.22),inset_0_-2px_0_oklch(0_0_0/0.28),0_1px_2px_oklch(0_0_0/0.25)]",
          "hover:bg-primary/90 hover:border-primary",
          "active:shadow-[inset_0_2px_3px_oklch(0_0_0/0.35)]",
        ].join(" "),

        // Latón grabado: acción secundaria con presencia.
        outline: [
          "border-border bg-secondary/60 text-foreground",
          "shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_1px_1px_oklch(0_0_0/0.10)]",
          "hover:bg-accent hover:border-gold-muted hover:text-accent-foreground",
          "aria-expanded:bg-accent aria-expanded:border-gold-muted",
          "active:shadow-[inset_0_2px_3px_oklch(0_0_0/0.18)]",
        ].join(" "),

        secondary: [
          "border-border/70 bg-secondary text-secondary-foreground",
          "shadow-[inset_0_1px_0_oklch(1_0_0/0.30),0_1px_1px_oklch(0_0_0/0.10)]",
          "hover:bg-accent hover:text-accent-foreground",
          "aria-expanded:bg-accent aria-expanded:text-accent-foreground",
          "active:shadow-[inset_0_2px_3px_oklch(0_0_0/0.18)]",
        ].join(" "),

        // Sin relieve: para barras de herramientas e iconos.
        ghost: [
          "border-transparent",
          "hover:bg-accent hover:text-accent-foreground",
          "aria-expanded:bg-accent aria-expanded:text-accent-foreground",
        ].join(" "),

        destructive: [
          "border-destructive/40 bg-destructive/10 text-destructive",
          "hover:bg-destructive/20 hover:border-destructive/60",
          "focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
          "dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        ].join(" "),

        // Los enlaces no se gritan: minúsculas y sin tracking.
        link: "border-transparent normal-case tracking-normal font-sans font-normal text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 px-2.5 text-[0.6875rem] tracking-[0.06em] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-11 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
