import { z } from "zod";
import { anchorEvent } from "./blockchain.service.js";

const AnchorSchema = z.object({
  eventType: z.string().min(3),
  eventHash: z.string().min(16) // hash created by backend/frontend
});

export async function anchor(req, res, next) {
  try {
    const body = AnchorSchema.parse(req.body);
    const userId = req.user.sub;
    const did = req.user.did;

    const record = await anchorEvent({
      userId,
      did,
      eventType: body.eventType,
      eventHash: body.eventHash,
      chainTx: null
    });

    res.status(201).json({ anchor: record });
  } catch (err) {
    next(err);
  }
}
