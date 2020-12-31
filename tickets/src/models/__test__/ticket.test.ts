import { Ticket } from '../ticket';

it('implemets optimistic concurrency control', async done => {
  const ticket = Ticket.build({ title: 'concert', price: 20, userId: '123' });
  await ticket.save();

  const firstInstance = await Ticket.findById(ticket.id);
  const secondInstance = await Ticket.findById(ticket.id);

  firstInstance!.set({ price: 25 });
  secondInstance!.set({ price: 30 });

  await firstInstance!.save();

  try {
    await secondInstance!.save();
  } catch (err) {
    return done();
  }

  throw new Error('Should not reach this point!');
});

it('incremets the version number on multiple saves', async () => {
  const ticket = Ticket.build({ title: 'concert', price: 20, userId: '123' });
  await ticket.save();
  expect(ticket.version).toEqual(0);

  await ticket.save();
  expect(ticket.version).toEqual(1);

  await ticket.save();
  expect(ticket.version).toEqual(2);
});
