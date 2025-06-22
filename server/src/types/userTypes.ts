export type Gender = "male" | "female";
export type Year = 1 | 2 | 3 | 4;
export type Status = "idle" | "searching" | "in-call";

export type Preferences = {
  gender: Gender | "any";
  years: Year[] | "any";
};

export type Identity = {
  gender: Gender;
  year: Year;
};

export type User = {
  id: string; // socket id
  identity: Identity;
  preferences: Preferences;
  status: Status;
  peerId: string | null;
  lastSeen: number;
};
