"use client";

import { useState, useTransition } from "react";
import { HandHelping, Plus, X } from "lucide-react";
import {
  acceptHelpOfferAction,
  cancelHelpRequestAction,
  createHelpRequestAction,
  listOffersForHelpRequestAction,
  offerHelpAction,
  withdrawHelpOfferAction,
} from "@/app/actions/network-help-requests";
import { formatActionError } from "@/shared/lib/operational-errors";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { formatDate } from "@/shared/types/customer";
import { NETWORK_TRADE_OPTIONS, type TradeType } from "@/shared/types/network";
import {
  NETWORK_REFERRAL_URGENCY_OPTIONS,
  formatNetworkHelpRequestStatus,
  formatNetworkReferralUrgency,
  isHelpRequestOpen,
  type NetworkHelpOffer,
  type NetworkHelpOfferAcceptFormData,
  type NetworkHelpRequest,
  type NetworkHelpRequestFormData,
} from "@/shared/types/network-help-request";
import { useSyncedState } from "@/shared/hooks/useSyncedState";
import { st, type NetworkSurface } from "./north-star-m11/network-north-star-styles";

type NetworkHelpRequestsPanelProps = {
  initialOpenRequests: NetworkHelpRequest[];
  initialMyRequests: NetworkHelpRequest[];
  canManage: boolean;
  timeZone?: string;
  surface?: NetworkSurface;
};

const EMPTY_POST_FORM: NetworkHelpRequestFormData = {
  tradeType: "General Contracting",
  title: "",
  details: "",
  city: "",
  state: "",
  postalCode: "",
  urgency: "normal",
};

const EMPTY_ACCEPT_FORM: NetworkHelpOfferAcceptFormData = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  serviceAddress: "",
  notes: "",
  incentiveNote: "",
};

function urgencyBadgeClass(isNorthStar: boolean) {
  return isNorthStar
    ? "inline-flex items-center rounded-full bg-[#FFF9EA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.15)]"
    : "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800";
}

export function NetworkHelpRequestsPanel({
  initialOpenRequests,
  initialMyRequests,
  canManage,
  timeZone,
  surface = "legacy",
}: NetworkHelpRequestsPanelProps) {
  const isNorthStar = surface === "north-star";
  const [subTab, setSubTab] = useState<"browse" | "mine">("browse");
  const [openRequests, setOpenRequests] = useSyncedState(initialOpenRequests);
  const [myRequests, setMyRequests] = useSyncedState(initialMyRequests);

  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState<NetworkHelpRequestFormData>(EMPTY_POST_FORM);
  const [postError, setPostError] = useState<string | null>(null);
  const [isPosting, startPostTransition] = useTransition();

  const [offerMessageByRequest, setOfferMessageByRequest] = useState<
    Record<string, string>
  >({});
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerPendingId, setOfferPendingId] = useState<string | null>(null);
  const [isOfferPending, startOfferTransition] = useTransition();

  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [offersByRequest, setOffersByRequest] = useState<
    Record<string, NetworkHelpOffer[]>
  >({});
  const [offersLoading, setOffersLoading] = useState<string | null>(null);
  const [cancelPendingId, setCancelPendingId] = useState<string | null>(null);
  const [isCancelPending, startCancelTransition] = useTransition();

  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [acceptForm, setAcceptForm] = useState<NetworkHelpOfferAcceptFormData>(
    EMPTY_ACCEPT_FORM,
  );
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [isAcceptPending, startAcceptTransition] = useTransition();

  const shellClass = isNorthStar
    ? st.cardShell
    : "rounded-xl border border-slate-200 bg-white p-4";
  const mutedClass = isNorthStar ? st.cardMuted : "text-xs text-slate-500";
  const titleTextClass = isNorthStar
    ? "text-sm font-bold text-[#17130E]"
    : "text-sm font-bold text-slate-900";
  const inputClass = isNorthStar
    ? "w-full rounded-lg border border-[rgba(138,99,36,0.2)] bg-white px-3 py-2 text-sm text-[#17130E] placeholder:text-[#8A7F6C] focus:outline-none focus:ring-2 focus:ring-[#8A6324]/30"
    : adminFormInputClass;
  const primaryButtonClass = isNorthStar
    ? st.panelActionAccent
    : "inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60";
  const secondaryButtonClass = isNorthStar
    ? "inline-flex items-center gap-2 rounded-xl border border-[rgba(138,99,36,0.2)] bg-white px-3 py-2 text-xs font-semibold text-[#4F4638] hover:bg-[#FFF9EA] disabled:opacity-60"
    : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
  const dangerButtonClass = isNorthStar
    ? "inline-flex items-center gap-2 rounded-xl border border-[rgba(185,28,28,0.28)] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#991B1B] hover:bg-[#FEE2E2] disabled:opacity-60"
    : "inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60";
  const cardClass = isNorthStar
    ? "rounded-lg border border-[rgba(138,99,36,0.12)] bg-white p-3"
    : "rounded-lg border border-slate-200 bg-slate-50/60 p-3";

  function handlePost() {
    setPostError(null);
    startPostTransition(async () => {
      const result = await createHelpRequestAction(postForm);
      if (result.error || !result.request) {
        setPostError(formatActionError(result.error, "We couldn't post this request."));
        return;
      }
      setMyRequests((current) => [result.request!, ...current]);
      setPostForm(EMPTY_POST_FORM);
      setShowPostForm(false);
      setSubTab("mine");
    });
  }

  function handleOffer(requestId: string) {
    setOfferError(null);
    setOfferPendingId(requestId);
    startOfferTransition(async () => {
      const result = await offerHelpAction(requestId, offerMessageByRequest[requestId]);
      if (result.error) {
        setOfferError(formatActionError(result.error, "We couldn't send that offer."));
        return;
      }
      setOpenRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? {
                ...request,
                myOfferStatus: "pending",
                myOfferId: result.offer?.id,
                offerCount: (request.offerCount ?? 0) + 1,
              }
            : request,
        ),
      );
    });
  }

  function handleWithdrawOffer(requestId: string) {
    const request = openRequests.find((item) => item.id === requestId);
    if (!request?.myOfferId) {
      return;
    }
    setOfferError(null);
    setOfferPendingId(requestId);
    startOfferTransition(async () => {
      const result = await withdrawHelpOfferAction(request.myOfferId!);
      if (result.error) {
        setOfferError(formatActionError(result.error, "We couldn't withdraw that offer."));
        return;
      }
      setOpenRequests((current) =>
        current.map((item) =>
          item.id === requestId
            ? { ...item, myOfferStatus: "withdrawn", myOfferId: undefined }
            : item,
        ),
      );
    });
  }

  async function toggleExpandRequest(requestId: string) {
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null);
      return;
    }
    setExpandedRequestId(requestId);
    setAcceptingOfferId(null);
    if (!offersByRequest[requestId]) {
      setOffersLoading(requestId);
      const result = await listOffersForHelpRequestAction(requestId);
      setOffersByRequest((current) => ({
        ...current,
        [requestId]: result.offers,
      }));
      setOffersLoading(null);
    }
  }

  function handleCancel(requestId: string) {
    setCancelPendingId(requestId);
    startCancelTransition(async () => {
      const result = await cancelHelpRequestAction(requestId);
      if (result.request) {
        setMyRequests((current) =>
          current.map((request) =>
            request.id === requestId ? result.request! : request,
          ),
        );
      }
    });
  }

  function handleAcceptOffer(requestId: string, offerId: string) {
    setAcceptError(null);
    startAcceptTransition(async () => {
      const result = await acceptHelpOfferAction({
        helpRequestId: requestId,
        offerId,
        customer: acceptForm,
      });
      if (result.error || !result.request) {
        setAcceptError(formatActionError(result.error, "We couldn't accept that offer."));
        return;
      }
      setMyRequests((current) =>
        current.map((request) =>
          request.id === requestId ? result.request! : request,
        ),
      );
      setOffersByRequest((current) => ({ ...current, [requestId]: [] }));
      setAcceptingOfferId(null);
      setAcceptForm(EMPTY_ACCEPT_FORM);
      setExpandedRequestId(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HandHelping className="h-4 w-4 shrink-0 text-current opacity-70" />
          <h2 className={titleTextClass}>Help Requests</h2>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => setShowPostForm((current) => !current)}
            className={primaryButtonClass}
          >
            {showPostForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {showPostForm ? "Cancel" : "Post a request"}
          </button>
        ) : null}
      </div>
      <p className={mutedClass}>
        Structured &ldquo;need a hand&rdquo; posts — trade, urgency, and rough
        location only. Customer details are shared only with the company you
        choose
        to accept.
      </p>

      {showPostForm ? (
        <div className={shellClass}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={mutedClass}>Trade</label>
              <select
                value={postForm.tradeType}
                onChange={(event) =>
                  setPostForm((current) => ({
                    ...current,
                    tradeType: event.target.value as TradeType,
                  }))
                }
                className={`${inputClass} mt-1`}
              >
                {NETWORK_TRADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={mutedClass}>Urgency</label>
              <select
                value={postForm.urgency}
                onChange={(event) =>
                  setPostForm((current) => ({
                    ...current,
                    urgency: event.target.value as NetworkHelpRequestFormData["urgency"],
                  }))
                }
                className={`${inputClass} mt-1`}
              >
                {NETWORK_REFERRAL_URGENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className={mutedClass}>Title</label>
            <input
              type="text"
              value={postForm.title}
              onChange={(event) =>
                setPostForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder='e.g. "Need an electrician, urgent"'
              className={`${inputClass} mt-1`}
            />
          </div>

          <div className="mt-3">
            <label className={mutedClass}>Details (optional)</label>
            <textarea
              value={postForm.details}
              onChange={(event) =>
                setPostForm((current) => ({ ...current, details: event.target.value }))
              }
              rows={2}
              className={`${inputClass} mt-1`}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className={mutedClass}>City</label>
              <input
                type="text"
                value={postForm.city}
                onChange={(event) =>
                  setPostForm((current) => ({ ...current, city: event.target.value }))
                }
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className={mutedClass}>State</label>
              <input
                type="text"
                value={postForm.state}
                onChange={(event) =>
                  setPostForm((current) => ({ ...current, state: event.target.value }))
                }
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className={mutedClass}>ZIP</label>
              <input
                type="text"
                value={postForm.postalCode}
                onChange={(event) =>
                  setPostForm((current) => ({
                    ...current,
                    postalCode: event.target.value,
                  }))
                }
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>

          {postError ? <p className="mt-3 text-xs text-rose-700">{postError}</p> : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handlePost}
              disabled={isPosting}
              className={primaryButtonClass}
            >
              {isPosting ? "Posting…" : "Post request"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSubTab("browse")}
          className={
            subTab === "browse" ? primaryButtonClass : secondaryButtonClass
          }
        >
          Open requests · {openRequests.length}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("mine")}
          className={subTab === "mine" ? primaryButtonClass : secondaryButtonClass}
        >
          My posts · {myRequests.length}
        </button>
      </div>

      {subTab === "browse" ? (
        <div className="space-y-2">
          {offerError ? <p className="text-xs text-rose-700">{offerError}</p> : null}
          {openRequests.length === 0 ? (
            <p className={mutedClass}>No open Help Requests right now.</p>
          ) : (
            openRequests.map((request) => (
              <div key={request.id} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={
                        isNorthStar
                          ? "text-sm font-semibold text-[#17130E]"
                          : "text-sm font-semibold text-slate-900"
                      }
                    >
                      {request.title}
                    </p>
                    <p className={mutedClass}>
                      {request.companyName ?? "A network company"} ·{" "}
                      {request.tradeType} ·{" "}
                      {[request.city, request.state].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <span className={urgencyBadgeClass(isNorthStar)}>
                    {formatNetworkReferralUrgency(request.urgency)}
                  </span>
                </div>
                {request.details ? (
                  <p className={`mt-2 ${mutedClass}`}>{request.details}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {request.myOfferStatus ? (
                    <>
                      <span className={mutedClass}>
                        {request.myOfferStatus === "pending"
                          ? "Offer sent — waiting on a response"
                          : request.myOfferStatus === "accepted"
                            ? "Offer accepted"
                            : request.myOfferStatus === "declined"
                              ? "Offer not selected"
                              : "Offer withdrawn"}
                      </span>
                      {request.myOfferStatus === "pending" ? (
                        <button
                          type="button"
                          onClick={() => handleWithdrawOffer(request.id)}
                          disabled={isOfferPending && offerPendingId === request.id}
                          className={secondaryButtonClass}
                        >
                          Withdraw
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={offerMessageByRequest[request.id] ?? ""}
                        onChange={(event) =>
                          setOfferMessageByRequest((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Optional note (e.g. availability)"
                        className={`${inputClass} max-w-xs`}
                      />
                      <button
                        type="button"
                        onClick={() => handleOffer(request.id)}
                        disabled={isOfferPending && offerPendingId === request.id}
                        className={primaryButtonClass}
                      >
                        Offer to help
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {myRequests.length === 0 ? (
            <p className={mutedClass}>You haven&apos;t posted any Help Requests yet.</p>
          ) : (
            myRequests.map((request) => (
              <div key={request.id} className={cardClass}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={
                        isNorthStar
                          ? "text-sm font-semibold text-[#17130E]"
                          : "text-sm font-semibold text-slate-900"
                      }
                    >
                      {request.title}
                    </p>
                    <p className={mutedClass}>
                      {request.tradeType} ·{" "}
                      {[request.city, request.state].filter(Boolean).join(", ")} ·
                      Posted {formatDate(request.createdAt, timeZone)}
                    </p>
                  </div>
                  <span className={urgencyBadgeClass(isNorthStar)}>
                    {formatNetworkHelpRequestStatus(request.status)}
                  </span>
                </div>

                {isHelpRequestOpen(request) ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpandRequest(request.id)}
                      className={secondaryButtonClass}
                    >
                      {expandedRequestId === request.id ? "Hide offers" : "View offers"}
                      {typeof request.offerCount === "number"
                        ? ` · ${request.offerCount}`
                        : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancel(request.id)}
                      disabled={isCancelPending && cancelPendingId === request.id}
                      className={dangerButtonClass}
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                {expandedRequestId === request.id ? (
                  <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3">
                    {offersLoading === request.id ? (
                      <p className={mutedClass}>Loading offers…</p>
                    ) : (offersByRequest[request.id] ?? []).length === 0 ? (
                      <p className={mutedClass}>No offers yet.</p>
                    ) : (
                      (offersByRequest[request.id] ?? []).map((offer) => (
                        <div key={offer.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900">
                                {offer.companyName ?? "A network company"}
                              </p>
                              {offer.message ? (
                                <p className={mutedClass}>{offer.message}</p>
                              ) : null}
                            </div>
                            {offer.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setAcceptingOfferId(offer.id);
                                  setAcceptError(null);
                                }}
                                className={primaryButtonClass}
                              >
                                Accept
                              </button>
                            ) : (
                              <span className={mutedClass}>{offer.status}</span>
                            )}
                          </div>

                          {acceptingOfferId === offer.id ? (
                            <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3">
                              <p className={mutedClass}>
                                Enter the customer&apos;s details — only{" "}
                                {offer.companyName ?? "this company"} will see
                                them.
                              </p>
                              <input
                                type="text"
                                value={acceptForm.customerName}
                                onChange={(event) =>
                                  setAcceptForm((current) => ({
                                    ...current,
                                    customerName: event.target.value,
                                  }))
                                }
                                placeholder="Customer name"
                                className={inputClass}
                              />
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                  type="text"
                                  value={acceptForm.customerPhone}
                                  onChange={(event) =>
                                    setAcceptForm((current) => ({
                                      ...current,
                                      customerPhone: event.target.value,
                                    }))
                                  }
                                  placeholder="Phone"
                                  className={inputClass}
                                />
                                <input
                                  type="email"
                                  value={acceptForm.customerEmail}
                                  onChange={(event) =>
                                    setAcceptForm((current) => ({
                                      ...current,
                                      customerEmail: event.target.value,
                                    }))
                                  }
                                  placeholder="Email"
                                  className={inputClass}
                                />
                              </div>
                              <input
                                type="text"
                                value={acceptForm.serviceAddress}
                                onChange={(event) =>
                                  setAcceptForm((current) => ({
                                    ...current,
                                    serviceAddress: event.target.value,
                                  }))
                                }
                                placeholder="Service address"
                                className={inputClass}
                              />
                              <textarea
                                value={acceptForm.notes}
                                onChange={(event) =>
                                  setAcceptForm((current) => ({
                                    ...current,
                                    notes: event.target.value,
                                  }))
                                }
                                placeholder="Notes (optional)"
                                rows={2}
                                className={inputClass}
                              />
                              {acceptError ? (
                                <p className="text-xs text-rose-700">{acceptError}</p>
                              ) : null}
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAcceptingOfferId(null);
                                    setAcceptForm(EMPTY_ACCEPT_FORM);
                                  }}
                                  className={secondaryButtonClass}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptOffer(request.id, offer.id)}
                                  disabled={isAcceptPending}
                                  className={primaryButtonClass}
                                >
                                  {isAcceptPending
                                    ? "Confirming…"
                                    : "Confirm & send referral"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
