const { HttpError, requireText } = require('../utils/http');
const { ORDER_STAGES } = require('../utils/constants');

const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

exports.validatePurchase = (req, res, next) => {
  const postId = Number(req.body.postId);
  if (!Number.isInteger(postId) || postId < 1) {
    throw new HttpError(400, '구매할 판매글(postId)을 선택해 주세요.');
  }

  const receiverName = requireText(req.body.name, '받는 사람 이름(name)', 30);
  const receiverPhone = requireText(req.body.phone, '전화번호(phone)', 20);
  if (!PHONE_RE.test(receiverPhone)) {
    throw new HttpError(400, '전화번호는 010-1234-5678 형식으로 입력해 주세요.');
  }
  const address = requireText(req.body.address, '배송주소(address)', 200);
  if (address.length < 5) {
    throw new HttpError(400, '배송주소를 정확히 입력해 주세요.');
  }

  req.validated = {
    postId,
    receiver: { receiverName, receiverPhone, address },
    paymentInfo: { method: req.body.paymentMethod, amount: req.body.amount },
  };
  next();
};

exports.validateOrderStageQuery = (req, res, next) => {
  const { stage } = req.query;
  if (stage && !ORDER_STAGES.includes(stage)) {
    throw new HttpError(400, `stage는 ${ORDER_STAGES.join(', ')} 중 하나여야 합니다.`);
  }
  req.validatedStage = stage;
  next();
};
