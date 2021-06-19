var createOne = model => async (req, res) => {
  try {
    let doc = await model.create({ ...req.body })
    res.status(201).json(doc)
  } catch (e) {
    console.log(e);
    res.status(400).end();
  }
};

var getOne = model => async (req, res) => {
  try {
    let doc = await model.find({ ...req.body })
      .lean()
      .exec();

    res.status(200).json(doc)
  } catch (e) {
    console.log(e);
    res.status(400).end();
  }
};

var getById = model => async (req, res) => {
  try {
    let doc = await model.findById(req.params.id)
      .lean()
      .exec();

    res.status(200).json(doc)
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

    res.status(200).json(docs)
  } catch (e) {
    console.log(e);
    res.status(400).end();
  }
}

var deleteOne = model => (req, res) => {
  try {
    model.findOneAndDelete({ ...req.body }, (err, removed) => {
      return res.status(200).json(removed);
    });
  } catch (err) {
    console.log(err);
    res.status(400).end();
  }
}

var deleteById = model => (req, res) => {
  try {
    model.findByIdAndDelete(req.params.id, (err, removed) => {
      return res.status(200).json(removed);
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
    getById: getById(model),
    deleteOne: deleteOne(model),
    deleteById: deleteById(model),
    deleteAll: deleteAll(model),
    getAll: getAll(model)
  }
};
