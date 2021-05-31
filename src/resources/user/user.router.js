import crudRouter from '../../utils/crudRouter';
import User from './user.model';
import Exchange from '../exchange/exchange.model';

var router = crudRouter(User);

router
  .route('/:id/exchanges')
  .get((req, res) => {
    User
      .findById(req.params.id, 'exchanges')
      .populate({ 
        path: 'exchanges',
        populate: { path: '_id', model: Exchange }
      })
      .exec((err, exchanges) => {
        if (err) {
          console.log(err);
          res.status(400).end();
        }
        return res.status(200).json(exchanges);
      });
  })
  .post((req, res) => {
    User.findById(req.params.id, async (err, user) => {
      if (err) {
        console.log(err);
        return res.status(400).end();
      }
      let exchange = user.exchanges.id(req.body._id);
      // if doc already exsits -> update
      if (exchange) exchange.set(req.body);

      // if doc deasn't exist -> create
      else user.exchanges.push(req.body);
      user.save((err, doc) => {
        if (err) {
          console.log(err);
          return res.status(400).end();
        }
        res.status(200).json(doc);
      })
    });
  })
  .delete(async (req, res) => {
    if (req.body.info) {
      User.updateOne(
        { "_id": req.params.id },
        { "$pull": { "exchanges": { "_id": req.body._id } } },
        (err, doc) => {
          if (err) {
            console.log(err);
            return res.status(400).end();
          }
          res.status(200).json(doc);
        }
      )
    } else {
      User.updateOne(
        { "_id": req.params.id },
        { "$set":  { "exchanges": [] } },
        (err, doc) => {
          if (err) {
            console.log(err);
            return res.status(400).end();
          }
          res.status(200).json(doc)
        }
      )
    }
  });

export default router;
