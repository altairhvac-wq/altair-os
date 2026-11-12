import Image from "next/image";
import { ResourceCard, resourceLinkClass } from "@/shared/components/resources/ResourcePageShell";
import {
  TOOL_BAG_PRICES_AS_OF,
  TOOL_BAG_ROUNDS,
  type ToolBagContender,
  type ToolBagLink,
  type ToolBagRound,
  type ToolBagSharedTool,
  type ToolBagSource,
  type ToolBagTier,
} from "@/shared/lib/resources/black-friday-tool-bags.generated";
import {
  TOOL_BAG_TIERS,
  formatToolBagDate,
  formatToolBagMoney,
  pickForTier,
  roundAnchor,
  tierLabel,
  tierTotal,
} from "@/shared/lib/resources/black-friday-tool-bags";

/**
 * The tool-bag guide's repeating pieces. All server-rendered: the full text of
 * every contender is in the HTML, with the longer spec lists folded behind a
 * native `<details>`, so the page needs no client JavaScript of its own.
 */

const EXTERNAL_REL = "noopener noreferrer nofollow";

const TIER_CHIP: Record<ToolBagTier, string> = {
  top: "bg-[#0A0A0A] text-white",
  budget: "bg-stone-200 text-stone-800",
  pick: "bg-[#FBF7EF] text-[#77591B] ring-1 ring-inset ring-[#C2A05A]/50",
};

const PRICE_TAG: Record<ToolBagContender["tag"], string> = {
  "EVERYDAY PRICE": "Everyday price",
  "REAL DEAL": "Real deal",
  "FREE WITH KIT": "Free tool with kit",
};

function TierChip({ tier }: { readonly tier: ToolBagTier }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TIER_CHIP[tier]}`}
    >
      {tierLabel(tier)}
    </span>
  );
}

function StoreLink({ link }: { readonly link: ToolBagLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel={EXTERNAL_REL}
      className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 transition-colors hover:border-[#C2A05A] hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
    >
      {link.label}
    </a>
  );
}

function ProductPhoto({ src, alt }: { readonly src: string; readonly alt: string }) {
  return (
    <div className="relative size-20 shrink-0 sm:size-24">
      <Image src={src} alt={alt} fill sizes="96px" className="object-contain" />
    </div>
  );
}

function BulletList({
  label,
  items,
  mark,
  markClass,
}: {
  readonly label: string;
  readonly items: readonly string[];
  readonly mark: string;
  readonly markClass: string;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">{label}</h4>
      <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-stone-700">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className={`shrink-0 font-semibold ${markClass}`}>
              {mark}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoodAndBad({
  pros,
  cons,
}: {
  readonly pros: readonly string[];
  readonly cons: readonly string[];
}) {
  return (
    <div className="mt-4 space-y-3">
      <BulletList label="The good" items={pros} mark="+" markClass="text-emerald-700" />
      <BulletList label="The bad" items={cons} mark="–" markClass="text-red-700" />
    </div>
  );
}

function SpecsAndSources({
  specs,
  sources,
  gaps,
}: {
  readonly specs: readonly string[];
  readonly sources: readonly ToolBagSource[];
  readonly gaps?: string | null;
}) {
  return (
    <details className="group mt-4 rounded-lg border border-stone-200 bg-stone-50/70">
      <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40">
        Key specs and sources
      </summary>
      <div className="border-t border-stone-200 px-3 py-3">
        <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-stone-700">
          {specs.map((spec) => (
            <li key={spec}>{spec}</li>
          ))}
        </ul>
        {gaps ? <p className="mt-2 text-xs text-stone-500">Not confirmed: {gaps}</p> : null}
        <p className="mt-3 text-xs leading-relaxed text-stone-500">
          Sources:{" "}
          {sources.map((source, index) => (
            <span key={source.host}>
              {index > 0 ? " · " : null}
              <a href={source.url} target="_blank" rel={EXTERNAL_REL} className={resourceLinkClass}>
                {source.host}
              </a>
            </span>
          ))}
        </p>
      </div>
    </details>
  );
}

function ContenderCard({ contender }: { readonly contender: ToolBagContender }) {
  return (
    <article id={contender.key} className="scroll-mt-24">
      <ResourceCard className="h-full">
        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col gap-2">
            <ProductPhoto src={contender.image} alt={`${contender.name}, product photo`} />
            {contender.extraImage ? (
              <ProductPhoto
                src={contender.extraImage}
                alt="Veto Pro Pac DHX compact drill holster, product photo"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-snug tracking-tight text-[#0A0A0A]">
              {contender.name}
            </h3>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
              <span className="text-xl font-semibold tabular-nums text-[#0A0A0A]">
                {formatToolBagMoney(contender.price)}
              </span>
              {contender.wasPrice !== null ? (
                <span className="text-sm tabular-nums text-stone-500">
                  was <s>{formatToolBagMoney(contender.wasPrice)}</s>
                </span>
              ) : null}
              <span className="text-sm text-stone-600">{contender.store}</span>
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {PRICE_TAG[contender.tag]} · as of {TOOL_BAG_PRICES_AS_OF}
              {contender.recheckedOn
                ? `, re-checked ${formatToolBagDate(contender.recheckedOn)}`
                : ""}
            </p>
            {contender.tiers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contender.tiers.map((tier) => (
                  <TierChip key={tier} tier={tier} />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {contender.parts.length > 0 ? (
          <p className="mt-3 text-sm text-stone-600">
            {contender.parts
              .map((part) => `${part.name} ${formatToolBagMoney(part.price)}`)
              .join(" + ")}
          </p>
        ) : null}
        {contender.offerNote ? (
          <p className="mt-3 text-sm text-stone-600">{contender.offerNote}</p>
        ) : null}

        <GoodAndBad pros={contender.pros} cons={contender.cons} />

        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          <span className="font-semibold text-stone-900">Best for: </span>
          {contender.bestFor}
        </p>

        <SpecsAndSources specs={contender.specs} sources={contender.sources} gaps={contender.gaps} />

        <div className="mt-4 flex flex-wrap gap-2">
          {contender.links.map((link) => (
            <StoreLink key={link.href} link={link} />
          ))}
        </div>
      </ResourceCard>
    </article>
  );
}

function SharedToolCard({ tool }: { readonly tool: ToolBagSharedTool }) {
  return (
    <aside aria-label={tool.name} className="mt-5">
      <ResourceCard>
        <div className="flex gap-4">
          <ProductPhoto src={tool.image} alt={`${tool.name}, product photo`} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#77591B]">
              In all three bags
            </p>
            <h3 className="mt-1 text-base font-semibold leading-snug tracking-tight text-[#0A0A0A]">
              {tool.name}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Every price in this round already includes this wrench.
            </p>
          </div>
        </div>
        <GoodAndBad pros={tool.pros} cons={tool.cons} />
        <p className="mt-3 text-sm leading-relaxed text-stone-700">
          <span className="font-semibold text-stone-900">Best for: </span>
          {tool.bestFor}
        </p>
        <SpecsAndSources specs={tool.specs} sources={tool.sources} />
        <div className="mt-4">
          <StoreLink link={tool.link} />
        </div>
      </ResourceCard>
    </aside>
  );
}

export function ToolBagRoundSection({
  round,
  number,
}: {
  readonly round: ToolBagRound;
  readonly number: number;
}) {
  const anchor = roundAnchor(round.slot);

  return (
    <section id={anchor} aria-labelledby={`${anchor}-title`} className="mt-12 scroll-mt-24">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">
        Round {number}
      </p>
      <h2
        id={`${anchor}-title`}
        className="mt-1 text-2xl font-semibold tracking-tight text-[#0A0A0A]"
      >
        {round.slot}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base">
        <span className="font-semibold text-stone-800">What matters: </span>
        {round.whatMatters}
      </p>

      <div className="mt-5 grid items-start gap-5 md:grid-cols-2">
        {round.contenders.map((contender) => (
          <ContenderCard key={contender.key} contender={contender} />
        ))}
      </div>

      {round.included.map((item) => (
        <p
          key={item.name}
          className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
        >
          {item.tiers.map((tier) => (
            <TierChip key={tier} tier={tier} />
          ))}
          <span>{item.name}, so this round adds $0.00.</span>
        </p>
      ))}

      {round.sharedTool ? <SharedToolCard tool={round.sharedTool} /> : null}
    </section>
  );
}

export function ToolBagCompareTable() {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <caption className="sr-only">
          The pick and price in each of the 12 rounds, for all three builds
        </caption>
        <thead>
          <tr className="border-b border-stone-200 text-xs uppercase tracking-[0.1em] text-stone-500">
            <th scope="col" className="px-4 py-3 font-semibold">
              Round
            </th>
            {TOOL_BAG_TIERS.map((tier) => (
              <th key={tier.key} scope="col" className="px-4 py-3 font-semibold">
                {tier.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TOOL_BAG_ROUNDS.map((round) => (
            <tr key={round.slot} className="border-b border-stone-100 align-top">
              <th scope="row" className="px-4 py-3 font-medium text-stone-900">
                <a href={`#${roundAnchor(round.slot)}`} className={resourceLinkClass}>
                  {round.slot}
                </a>
              </th>
              {TOOL_BAG_TIERS.map((tier) => {
                const pick = pickForTier(round, tier.key);
                return (
                  <td key={tier.key} className="px-4 py-3 text-stone-700">
                    {pick?.kind === "contender" ? (
                      <>
                        <span className="block">{pick.contender.name}</span>
                        <span className="tabular-nums text-stone-900">
                          {formatToolBagMoney(pick.contender.price)}
                        </span>
                      </>
                    ) : pick?.kind === "included" ? (
                      <>
                        <span className="block">{pick.name}</span>
                        <span className="tabular-nums text-stone-900">$0.00</span>
                      </>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-stone-50 font-semibold text-[#0A0A0A]">
            <th scope="row" className="px-4 py-3">
              Total
            </th>
            {TOOL_BAG_TIERS.map((tier) => (
              <td key={tier.key} className="px-4 py-3 tabular-nums">
                {formatToolBagMoney(tierTotal(tier.key))}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
