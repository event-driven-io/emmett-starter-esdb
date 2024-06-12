/* eslint-disable @typescript-eslint/no-floating-promises */
import { type EventStore } from '@event-driven-io/emmett';
import { getEventStoreDBEventStore } from '@event-driven-io/emmett-esdb';
import {
  ApiE2ESpecification,
  expectResponse,
  getApplication,
  type TestRequest,
} from '@event-driven-io/emmett-expressjs';
import {
  EventStoreDBContainer,
  StartedEventStoreDBContainer,
} from '@event-driven-io/emmett-testcontainers';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, it } from 'node:test';
import { guestStayAccountsApi } from './api';

const doesGuestStayExist = (_guestId: string, _roomId: string, _day: Date) =>
  Promise.resolve(true);

describe('guestStayAccount E2E', () => {
  // const oldTime = new Date();
  const now = new Date();
  // const formattedNow = formatDateToUtcYYYYMMDD(now);

  let guestId: string;
  let roomId: string;
  // let guestStayAccountId: string;
  // const amount = Math.random() * 100;
  const transactionId = randomUUID();

  let esdbContainer: StartedEventStoreDBContainer;
  let given: ApiE2ESpecification;

  before(async () => {
    esdbContainer = await new EventStoreDBContainer().start();

    given = ApiE2ESpecification.for(
      (): EventStore => getEventStoreDBEventStore(esdbContainer.getClient()),
      (eventStore: EventStore) =>
        getApplication({
          apis: [
            guestStayAccountsApi(
              eventStore,
              doesGuestStayExist,
              (prefix) => `${prefix}-${transactionId}`,
              () => now,
            ),
          ],
        }),
    );
  });

  beforeEach(() => {
    guestId = randomUUID();
    roomId = randomUUID();
    // guestStayAccountId = toGuestStayAccountId(guestId, roomId, now);
  });

  after(() => {
    return esdbContainer.stop();
  });

  describe('When empty', () => {
    const notExistingAccount: TestRequest[] = [];

    it('should add product item', () => {
      return given(...notExistingAccount)
        .when((request) => request.post(`/guests/${guestId}/stays/${roomId}`))
        .then([expectResponse(201)]);
    });
  });

  // describe('When empty', () => {
  //   it('should add product item', () => {
  //     return given((request) =>
  //       request
  //         .post(`/clients/${clientId}/shopping-carts/current/product-items`)
  //         .send(productItem),
  //     )
  //       .when((request) =>
  //         request.get(`/clients/${clientId}/shopping-carts/current`).send(),
  //       )
  //       .then([
  //         expectResponse(200, {
  //           body: {
  //             clientId,
  //             id: shoppingCartId,
  //             productItems: [
  //               {
  //                 quantity: productItem.quantity,
  //                 productId: productItem.productId,
  //               },
  //             ],
  //             status: 'Opened',
  //           },
  //         }),
  //       ]);
  //   });
  // });
});
