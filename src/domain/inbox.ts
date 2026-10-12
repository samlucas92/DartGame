export type CareerMessageKind = 'league' | 'life' | 'finance' | 'sponsor' | 'coach' | 'world' | 'tournament' | 'career';
export type CareerMessageResponse = 'accepted' | 'declined';

export type CareerMessage = {
	id: string;
	kind: CareerMessageKind;
	sender: string;
	subject: string;
	preview: string;
	body: string;
	receivedDate: string;
	isRead: boolean;
	requiresAcknowledgement: boolean;
	requiresResponse: boolean;
	response?: CareerMessageResponse;
	actionPath?: string;
	actionLabel?: string;
};

export function blockingCareerMessages(messages: readonly CareerMessage[]): CareerMessage[] {
	return messages.filter((message) => (
		(message.requiresResponse && !message.response)
		|| (message.requiresAcknowledgement && !message.isRead)
	));
}

