import { type Event } from '@event-driven-io/emmett';

////////////////////////////////////////////
////////// EVENTS
///////////////////////////////////////////

export type GuestCheckedIn = Event<
  'GuestCheckedIn',
  {
    guestStayAccountId: string;
    guestId: string;
    roomId: string;
    checkedInAt: Date;
  }
>;

export type ChargeRecorded = Event<
  'ChargeRecorded',
  {
    chargeId: string;
    guestStayAccountId: string;
    amount: number;
    recordedAt: Date;
  }
>;

export type PaymentRecorded = Event<
  'PaymentRecorded',
  {
    paymentId: string;
    guestStayAccountId: string;
    amount: number;
    recordedAt: Date;
  }
>;

export type GuestCheckedOut = Event<
  'GuestCheckedOut',
  {
    guestStayAccountId: string;
    checkedOutAt: Date;
    groupCheckoutId?: string;
  }
>;

export type GuestCheckoutFailed = Event<
  'GuestCheckoutFailed',
  {
    guestStayAccountId: string;
    reason: 'NotOpened' | 'BalanceNotSettled';
    failedAt: Date;
    groupCheckoutId?: string;
  }
>;

export type GuestStayAccountEvent =
  | GuestCheckedIn
  | ChargeRecorded
  | PaymentRecorded
  | GuestCheckedOut
  | GuestCheckoutFailed;

////////////////////////////////////////////
////////// Entity
///////////////////////////////////////////

export type NotExisting = { status: 'NotExisting' };

export type Opened = { status: 'Opened'; balance: number };

export type CheckedOut = { status: 'CheckedOut' };

export type GuestStayAccount = NotExisting | Opened | CheckedOut;

export const initialState = (): GuestStayAccount => ({
  status: 'NotExisting',
});

export const toGuestStayAccountId = (
  guestId: string,
  roomId: string,
  date: Date,
) => `guest_stay_account-${guestId}:${roomId}:${date.toLocaleDateString()}`;

////////////////////////////////////////////
////////// Evolve
///////////////////////////////////////////

export const evolve = (
  state: GuestStayAccount,
  { type, data: event }: GuestStayAccountEvent,
): GuestStayAccount => {
  switch (type) {
    case 'GuestCheckedIn': {
      return state.status === 'NotExisting'
        ? { status: 'Opened', balance: 0 }
        : state;
    }
    case 'ChargeRecorded': {
      return state.status === 'Opened'
        ? {
            ...state,
            balance: state.balance - event.amount,
          }
        : state;
    }
    case 'PaymentRecorded': {
      return state.status === 'Opened'
        ? {
            ...state,
            balance: state.balance + event.amount,
          }
        : state;
    }
    case 'GuestCheckedOut': {
      return state.status === 'Opened' ? { status: 'CheckedOut' } : state;
    }
    case 'GuestCheckoutFailed': {
      return state;
    }
    default: {
      const _notExistingEventType: never = type;
      return state;
    }
  }
};
