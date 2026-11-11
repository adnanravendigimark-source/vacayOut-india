/** Pages shown without the site header and footer (they have their own layout). */
export const BARE_PAGES = ["/login", "/signup"];

export const isBarePage = (pathname: string) => BARE_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
