import "../app.css";

/**
 * Loads the full stylesheet for this route. The root layout loads none, so the
 * public site can load the smaller app/public.css; see that file.
 */
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
