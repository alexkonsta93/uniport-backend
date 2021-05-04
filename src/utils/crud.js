var createOne = model => async (req, res) => {
  try {
    let doc = await model.create({ ...req.body })
    res.status(201).json({ data: doc })
  } catch (e) {
    console.log(e);
    res.status(400).end();
    console.log
  }
};

var getOne = model => async (req, res) => {
  try {
    let doc = await model.find({ ...req.body })
      .lean()
      .exec();

    res.status(200).json({ data: doc })
  } catch (e) {
    console.log(e);
    res.status(400).end();
  }
};

var getAll = model => async (req, res) => {
  try {
    let docs = await model.find({})
      .lean()
      .exec();

    res.status(200).json({ data: docs })
  } catch (e) {
    console.log(e);
    res.status(400).end();
  }
}

var deleteOne = model => (req, res) => {
  try {
    model.findOneAndDelete({ ...req.body }, (err, removed) => {
        return res.status(200).json({ data: removed });
    });
  } catch (err) {
    console.log(err);
    res.status(400).end();
  }
}

var deleteAll = model => async (req, res) => {
  try {
    let removed = await model.deleteMany({});
    if (!removed) return res.status(400).end();

    res.status(200).json({ data: removed });
  } catch (err) {
    console.log(err);
    res.status(400).end();
  }
}

export default model => {
  return {
    createOne: createOne(model),
    getOne: getOne(model),
    deleteOne: deleteOne(model),
    deleteAll: deleteAll(model),
    getAll: getAll(model)
  }
};
