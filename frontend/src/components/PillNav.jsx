import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./PillNav.css";

function joinClassNames(...parts) {
    return parts.filter(Boolean).join(" ");
}

function normalizeHash(href) {
    if (!href) return "";
    if (href.startsWith("#")) return href;
    const hashPart = href.includes("#") ? href.slice(href.indexOf("#")) : "";
    return hashPart;
}

export default function PillNav({ items = [], className = "" }) {
    const location = useLocation();
    const navigate = useNavigate();

    const activeHref = useMemo(() => {
        const currentHash = location.hash || "";
        if (location.pathname !== "/") return location.pathname;
        if (currentHash) return currentHash;
        return "#hero-primary";
    }, [location.hash, location.pathname]);

    const scrollToHash = hash => {
        const id = hash.replace("#", "");
        const target = document.getElementById(id);
        if (!target) return;

        const y = target.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        window.history.replaceState(null, "", hash);
    };

    return (
        <nav className={joinClassNames("pill-nav", className)} aria-label="Section navigation">
            {items.map(item => {
                const hash = normalizeHash(item.href);
                const isHashItem = Boolean(hash);
                const isActive = isHashItem ? activeHref === hash : activeHref === item.href;

                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={joinClassNames("pill-nav-item", isActive ? "is-active" : "")}
                        onClick={event => {
                            if (!isHashItem) return;

                            event.preventDefault();
                            if (location.pathname !== "/") {
                                navigate(`/${hash}`);
                                return;
                            }
                            scrollToHash(hash);
                        }}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
