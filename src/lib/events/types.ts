export type DomainEvent =
  | { type: "message.received"; payload: { messageId: string; phone: string } }
  | { type: "intent.resolved"; payload: { messageId: string; intent: string } }
  | { type: "transaction.created"; payload: { transactionId: string; negocioId: string } }
  | { type: "alert.evaluate"; payload: { negocioId: string; transactionId: string } }
  | { type: "notification.dispatch"; payload: { negocioId: string; tipo: string } }
  | { type: "otp.requested"; payload: { phone: string } };
