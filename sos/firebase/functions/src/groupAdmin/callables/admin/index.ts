/**
 * GroupAdmin Admin Callables - Main Export
 */

export {
  adminGetGroupAdminsList,
  adminGetGroupAdminDetail,
  adminUpdateGroupAdminStatus,
  adminVerifyGroup,
  adminProcessWithdrawal,
  adminGetWithdrawalsList,
  adminExportGroupAdmins,
} from "./groupAdmins";

export {
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  adminGetResourcesList,
} from "./resources";

export {
  adminCreatePost,
  adminUpdatePost,
  adminDeletePost,
  adminGetPostsList,
} from "./posts";

export {
  adminUpdateGroupAdminConfig,
  adminGetGroupAdminConfig,
} from "./config";

export {
  adminGetRecruitmentsList,
  adminGetGroupAdminRecruits,
} from "./recruitments";
