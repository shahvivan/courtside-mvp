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
};
