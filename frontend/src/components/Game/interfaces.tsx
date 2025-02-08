  export interface MatchData {
	matchID:	number;
	status:	'PENDING' | 'ACCEPTED' | 'DECLINED'
	scorePlayer1:      number;
	scorePlayer2:      number;
	players:           {ID: number};
  }