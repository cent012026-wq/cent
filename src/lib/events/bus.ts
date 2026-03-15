import { logger } from "@/lib/logger";
import type { DomainEvent } from "@/lib/events/types";

const domainEvents: DomainEvent[] = [];

export function publishDomainEvent(event: DomainEvent): void {
  domainEvents.push(event);
  logger.info("domain_event", event);
}

export function getDomainEventsSnapshot(): DomainEvent[] {
  return [...domainEvents];
}
