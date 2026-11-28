import "../public.css";

/**
 * The embed pages: one calculator each, shown inside other websites.
 *
 * No site menu, no footer and no Meta Pixel (that lives in the marketing
 * layout only): a visitor on someone else's website has not come to this
 * one. See shared/lib/resources/embeds.ts for what an embed is and why these
 * are the only pages another site may frame.
 *
 * <base target="_blank">: every link opens a new tab from the first moment,
 * before the page's script has loaded and with scripts off. Without it an
 * early click would try to load the full site inside the frame, the framing
 * ban would refuse it, and the visitor would be left with a browser error
 * box on someone else's page. (It has no href, so it does not touch the
 * base-uri rule.) Once the script is running, EmbedFrame handles the click.
 */
export default function EmbedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <base target="_blank" />
      <div className="min-h-full bg-[#fafaf9] text-stone-900">{children}</div>
    </>
  );
}
