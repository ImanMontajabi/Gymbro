// Google Material Symbols (Outlined). `name` is any valid symbol name, e.g.
// "edit", "delete", "close", "add", "check".
export default function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined select-none leading-none ${className}`}>
      {name}
    </span>
  )
}
