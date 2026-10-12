export type LedgerEntry = {
	id: string;
	type: 'starting-funds' | 'work-pay' | 'living-cost';
	amountPence: number;
	description: string;
	inGameDate: string;
	referenceId: string;
};

