export type RootStackParamList = {
  Main: undefined;
  BusinessDetail: { businessId: string };
  ReservationFlow: { businessId: string; businessName: string };
  ProfileAccount: undefined;
  ProfilePoints: undefined;
  ProfileAppointments: undefined;
  ProfileFavorites: undefined;
  ProfilePayments: undefined;
  ProfileSettings: undefined;
  LegalText: { legalKey: 'kvkk' | 'etk' };
  MessagesList: undefined;
  Chat: { conversationId: string; businessName?: string; messagingDisabled?: boolean };
  ExploreMap: undefined;
  BusinessReviews: { businessId: string; businessName: string };
};
