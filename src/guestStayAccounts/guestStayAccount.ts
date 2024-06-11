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
    guestStayAccountId: string;
    amount: number;
    recordedAt: Date;
  }
>;

export type PaymentRecorded = Event<
  'PaymentRecorded',
  {
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

export const getInitialState = (): GuestStayAccount => {
  return {
    status: 'NotExisting',
  };
};

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
      if (state.status !== 'NotExisting') return state;

      return { status: 'Opened', balance: 0 };
    }
    case 'ChargeRecorded': {
      if (state.status !== 'Opened') return state;

      return {
        ...state,
        balance: state.balance - event.amount,
      };
    }
    case 'PaymentRecorded': {
      if (state.status !== 'Opened') return state;

      return {
        ...state,
        balance: state.balance + event.amount,
      };
    }
    case 'GuestCheckedOut': {
      if (state.status !== 'Opened') return state;

      return {
        status: 'CheckedOut',
      };
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
