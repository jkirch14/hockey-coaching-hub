export const GAMESHEET_SOURCE = "GAMESHEET";

export type GameSheetScheduledGame = {
  gameId: string;
  seasonId: string;
  divisionId: string;
  teamId: string;
  date: string;
  opponent: string;
  location: string;
  league: string;
};

export const MANCHESTER_GSL_PARITY_GAMES: GameSheetScheduledGame[] = [
  {
    gameId: "2975369",
    seasonId: "15306",
    divisionId: "82312",
    teamId: "550287",
    date: "2026-09-12T11:40:00-04:00",
    opponent: "Concord Capitals 12U - Arsenault",
    location: "Pop Whalen Ice Center",
    league: "GSL Parity",
  },
  {
    gameId: "2975370",
    seasonId: "15306",
    divisionId: "82312",
    teamId: "550287",
    date: "2026-09-12T12:15:00-04:00",
    opponent: "NH Mtn Kings Pee Wee Major",
    location: "Pop Whalen Ice Center",
    league: "GSL Parity",
  },
];
