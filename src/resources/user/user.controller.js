var createTrade = model => async (req, res) => {
		var userId = req.user._id;
		try {
				let doc = await model.create({ ...req.body, userId });
				res.status(201).json({ data: doc });
		} catch (e) {
				console.log(e);
				res.status(400).end();
		}
}
