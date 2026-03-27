// Local type definitions matching Prisma enums
// These help with TypeScript compilation when Prisma enum imports have issues

export type UserRoleType = 
  | 'CITIZEN' 
  | 'RESPONDER' 
  | 'DISPATCHER' 
  | 'ORG_ADMIN' 
  | 'GOV_ADMIN' 
  | 'SUPER_ADMIN';

export type OrganizationTypeType = 
  | 'NGO' 
  | 'GOVERNMENT' 
  | 'PRIVATE' 
  | 'MULTI_STATE';

export type OrganizationTierType = 
  | 'BASIC' 
  | 'PREMIUM' 
  | 'ENTERPRISE';

export type HazardTypeType = 
  | 'FIRE' 
  | 'FLOOD' 
  | 'EARTHQUAKE' 
  | 'BUILDING_COLLAPSE' 
  | 'ROAD_ACCIDENT' 
  | 'MEDICAL_EMERGENCY' 
  | 'GAS_LEAK' 
  | 'POWER_OUTAGE' 
  | 'VIOLENCE' 
  | 'TERRORISM' 
  | 'OTHER';

export type IncidentSeverityType = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'CRITICAL';

export type IncidentStatusType = 
  | 'REPORTED' 
  | 'VERIFIED' 
  | 'ASSIGNED' 
  | 'DISPATCHED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'CLOSED' 
  | 'FALSE_ALARM';

export type ResponderStatusType = 
  | 'AVAILABLE' 
  | 'BUSY' 
  | 'OFFLINE' 
  | 'ON_BREAK';

export type ResourceTypeType = 
  | 'AMBULANCE' 
  | 'FIRE_TRUCK' 
  | 'RESCUE_VEHICLE' 
  | 'PATROL_CAR' 
  | 'HELICOPTER' 
  | 'MEDICAL_EQUIPMENT' 
  | 'BOAT' 
  | 'OTHER';

export type ResourceStatusType = 
  | 'AVAILABLE' 
  | 'DEPLOYED' 
  | 'MAINTENANCE' 
  | 'OUT_OF_SERVICE';

export type AlertPriorityType = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'CRITICAL';

export const ROLE_HIERARCHY: Record<UserRoleType, number> = {
  CITIZEN: 0,
  RESPONDER: 1,
  DISPATCHER: 2,
  ORG_ADMIN: 3,
  GOV_ADMIN: 4,
  SUPER_ADMIN: 5,
};

export const STATUS_TRANSITIONS: Record<IncidentStatusType, IncidentStatusType[]> = {
  REPORTED: ['VERIFIED', 'FALSE_ALARM'],
  VERIFIED: ['ASSIGNED', 'FALSE_ALARM'],
  ASSIGNED: ['DISPATCHED', 'VERIFIED'],
  DISPATCHED: ['IN_PROGRESS', 'ASSIGNED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  FALSE_ALARM: [],
};
