/**
 * routes/invite.routes.js
 *
 * Invite token routes:
 *   POST /api/invites/generate/:roomCode    → authenticated — generates invite
 *   GET  /api/invites/peek/:token           → PUBLIC — peek invite details (no auth)
 *   POST /api/invites/accept/:token         → authenticated — accept invite & join room
 *   DELETE /api/invites/revoke/:token       → authenticated — revoke invite
 *   GET  /api/invites/list/:roomCode        → authenticated owner — list all invites for room
 */
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const inviteController = require('../controllers/invite.controller');

// ── Public (no auth) ──────────────────────────────────────────────────────
// Peek invite details — anyone with the link can see room info before auth
router.get('/peek/:token', inviteController.peekInvite);

// ── Authenticated routes ──────────────────────────────────────────────────
router.use(authenticate);

router.post('/generate/:roomCode', inviteController.generateInvite);
router.post('/accept/:token', inviteController.acceptInvite);
router.delete('/revoke/:token', inviteController.revokeInvite);
router.get('/list/:roomCode', inviteController.listRoomInvites);

module.exports = router;
