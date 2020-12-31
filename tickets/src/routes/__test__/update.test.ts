import mongoose from 'mongoose';
import request from 'supertest';
import { Types } from 'mongoose';

import { app } from '../../app';
import { natsWrapper } from '../../nats-wrapper';
import { Ticket } from '../../models/ticket';

it('returns a 404 if the provided id does not exist', async () => {
  const id = new Types.ObjectId().toHexString();

  await request(app)
    .put(`/api/tickets/${id}`)
    .set('Cookie', global.signup())
    .send({ title: 'Title', price: 10 })
    .expect(404);
});

it('returns a 401 if the user is not authenticated', async () => {
  const id = new Types.ObjectId().toHexString();

  await request(app).put(`/api/tickets/${id}`).send({ title: 'Title', price: 10 }).expect(401);
});

it('returns a 401 if the user does not own a ticket', async () => {
  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', global.signup())
    .send({ title: 'Title', price: 10 });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', global.signup())
    .send({ title: 'Title 1', price: 20 })
    .expect(401);
});

it('returns a 400 if the user provides an invalid title or price', async () => {
  const cookie = global.signup();

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({ title: 'Title', price: 10 });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: '', price: 20 })
    .expect(400);

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: 'Title', price: -20 })
    .expect(400);
});

it('returns a 400 if the ticket is reserved', async () => {
  const cookie = global.signup();

  const updatedTitle = 'New Title';
  const updatedPrice = 20;

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({ title: 'Title', price: 10 });

  const ticket = await Ticket.findById(response.body.id);
  ticket!.set({ orderId: new mongoose.Types.ObjectId().toHexString() });
  await ticket!.save();

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: updatedTitle, price: updatedPrice })
    .expect(400);
});

it('updates the ticket provided valid inputs', async () => {
  const cookie = global.signup();

  const updatedTitle = 'New Title';
  const updatedPrice = 20;

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({ title: 'Title', price: 10 });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: updatedTitle, price: updatedPrice })
    .expect(200);

  const ticketResponse = await request(app).get(`/api/tickets/${response.body.id}`).send();

  expect(ticketResponse.body.title).toEqual(updatedTitle);
  expect(ticketResponse.body.price).toEqual(updatedPrice);
});

it('publishes an event', async () => {
  const cookie = global.signup();

  const updatedTitle = 'New Title';
  const updatedPrice = 20;

  const response = await request(app)
    .post('/api/tickets')
    .set('Cookie', cookie)
    .send({ title: 'Title', price: 10 });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set('Cookie', cookie)
    .send({ title: updatedTitle, price: updatedPrice })
    .expect(200);

  expect(natsWrapper.client.publish).toHaveBeenCalled();
});
