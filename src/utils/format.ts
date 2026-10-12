export function formatCurrency(pence: number): string {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency: 'GBP',
	}).format(pence / 100);
}

export function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`;
}

export function formatAverage(pointsScored: number, dartsThrown: number): string {
	if (dartsThrown === 0) {
		return '—';
	}
	return ((pointsScored / dartsThrown) * 3).toFixed(2);
}

export function titleCase(value: string): string {
	return value
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

