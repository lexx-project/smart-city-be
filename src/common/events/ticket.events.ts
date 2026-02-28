export class TicketCreatedEvent {
    constructor(
        public readonly ticketId: string,
        public readonly ticketNumber: string,
        public readonly categoryId: string,
    ) { }
}

export class TicketStatusUpdatedEvent {
    constructor(
        public readonly ticketId: string,
        public readonly oldStatus: string,
        public readonly newStatus: string,
        public readonly updatedBy: string,
    ) { }
}

export class TicketEscalatedEvent {
    constructor(
        public readonly ticketId: string,
        public readonly deadline: Date,
    ) { }
}
