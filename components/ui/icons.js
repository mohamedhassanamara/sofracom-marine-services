// The one icon set (lucide-react, tree-shaken). Icons are decorative by default
// (aria-hidden); give the surrounding button/link the accessible name.
// Directional icons (arrows, chevrons) mirror in right-to-left pages.
import { cx } from './cx';

export {
    AlertTriangle,
    Anchor,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    ExternalLink,
    FileText,
    Filter,
    Globe,
    Image as ImageIcon,
    Info,
    Loader2,
    LogOut,
    Mail,
    MapPin,
    Menu,
    MessageSquareText,
    Minus,
    Package,
    Paintbrush,
    Phone,
    Play,
    Plus,
    Search,
    Ship,
    ShoppingCart,
    SlidersHorizontal,
    Sparkles,
    Star,
    Trash2,
    Truck,
    User,
    Wrench,
    X,
    XCircle,
    Zap,
} from 'lucide-react';

export function Icon({ as: Component, size = 20, flip = false, className, label, ...rest }) {
    return (
        <Component
            size={size}
            strokeWidth={1.75}
            className={cx('shrink-0', flip && 'rtl:-scale-x-100', className)}
            aria-hidden={label ? undefined : true}
            aria-label={label}
            role={label ? 'img' : undefined}
            focusable="false"
            {...rest}
        />
    );
}
