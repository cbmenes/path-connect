import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-2pyTGW3_.mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { l as Slot } from "../_libs/@radix-ui/react-dialog+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/button-DtbP-xAu.js
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 min-h-11 px-4", {
	variants: {
		variant: {
			primary: "bg-navy text-primary-foreground hover:bg-navy-deep shadow-soft",
			accent: "bg-sage text-accent-foreground hover:bg-sage/90",
			outline: "border border-border bg-paper text-ink hover:bg-secondary",
			ghost: "text-ink hover:bg-secondary",
			danger: "bg-danger text-paper hover:bg-danger/90",
			link: "min-h-0 px-0 text-navy underline-offset-4 hover:underline"
		},
		size: {
			default: "min-h-11",
			sm: "min-h-9 px-3 text-sm",
			lg: "min-h-12 px-5 text-base",
			icon: "size-11 p-0"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "default"
	}
});
function Button({ className, variant, size, asChild, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
//#endregion
export { Button as t };
