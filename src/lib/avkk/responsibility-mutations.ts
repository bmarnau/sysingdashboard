export interface ResponsibilityCandidate {
  userId: string;
  displayName: string;
}

export interface ResponsibilityMutationPort {
  listCandidates(responsibilityId: string): Promise<readonly ResponsibilityCandidate[]>;
  transferOwner(input: { responsibilityId: string; targetUserId: string }): Promise<string>;
  addDeputy(input: { responsibilityId: string; targetUserId: string }): Promise<string>;
  endResponsibility(input: { responsibilityId: string }): Promise<boolean>;
}
