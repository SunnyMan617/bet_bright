export type SelectionIdentity = {
  eventId: number;
  marketId: string;
  outcomeId: string;
};

export type SlipLeg = SelectionIdentity & {
  event: string;
  homeTeam?: string;
  awayTeam?: string;
  sport: string;
  league: string;
  region: string;
  startsAt?: string;
  isLive: boolean;
  market: string;
  selection: string;
  odds: number;
  isActive: boolean;
};

export type DecodedSlip = {
  code: string;
  provider: "Betway Nigeria";
  fetchedAt: string;
  selections: SlipLeg[];
  totalOdds: number;
  activeSelections: number;
};

export type Verification = {
  matched: boolean;
  requestedCount: number;
  decodedCount: number;
  missing: SelectionIdentity[];
  unexpected: SelectionIdentity[];
};

export type EncodedSlip = {
  code: string;
  slip: DecodedSlip;
  verification: Verification;
};

export type ConvertedSlip = EncodedSlip & {
  sourceCode: string;
  sourceSlip: DecodedSlip;
};

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};
