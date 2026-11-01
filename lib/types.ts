export type SportEvent = {
  id: string;
  title: string;
  sport: string;
  venue: string;
  starts: string;
  capacity: number;
  description: string;
  access: string;
  status: "draft" | "published" | "cancelled";
  demo: number;
  mine: number;
  players: number;
  waiting: number;
  spectators: number;
  myPlay?: string;
  myWatch?: string;
  myPaid: boolean | null;
  myName?: string | null;
  myWaitPosition?: number | null;
};

export type Participant = {
  id: number;
  name: string;
  role: "play" | "watch";
  state: "confirmed" | "waitlisted";
  paid: boolean | null;
  showed: boolean | null;
};

export type Suggestion =
  | { off: true }
  | { off: false; ready: false; finished: number; needed: number }
  | { off: false; ready: true; rate: number; predicted: number; reserves: number; stillComing: boolean; games: number; scope: string };

export type GameLearning = {
  predicted_drops: number | null;
  suggested_reserves: number | null;
  chosen_reserves: number | null;
  choice: "accepted" | "edited" | "dismissed" | null;
  actual_drops: number | null;
  closed_at: string | null;
};

export type RuleChange = {
  id: number;
  sport: string;
  slot: string;
  old_rate: number | null;
  new_rate: number;
  games: number;
  at: string;
  reviewed_at: string | null;
};
