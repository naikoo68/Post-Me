// Central import of every model so the ODM registry is fully populated before
// we create tables, run $lookup aggregations, or resolve populate() refs.
//
// registerModelPlugins is imported FIRST so the global tenant plugin (which adds
// `tenantId` to every schema) is registered before any schema is compiled.
import "../config/registerModelPlugins.js";

import ContentShare from "./ContentShare.js";
import Coupon from "./Coupon.js";
import EmailOtp from "./EmailOtp.js";
import Exam from "./Exam.js";
import ExamPost from "./ExamPost.js";
import FbPost from "./FbPost.js";
import FbSchedule from "./FbSchedule.js";
import LongVideoJob from "./LongVideoJob.js";
import Message from "./Message.js";
import Notice from "./Notice.js";
import PracticeExam from "./PracticeExam.js";
import PracticeStream from "./PracticeStream.js";
import PracticeSubject from "./PracticeSubject.js";
import PracticeTopic from "./PracticeTopic.js";
import Question from "./Question.js";
import Quiz from "./Quiz.js";
import Session from "./Session.js";
import Settings from "./Settings.js";
import Stream from "./Stream.js";
import Subject from "./Subject.js";
import Tenant from "./Tenant.js";
import TestSeries from "./TestSeries.js";
import Topic from "./Topic.js";
import TrialClaim from "./TrialClaim.js";
import User from "./User.js";

export const models = {
  ContentShare, Coupon, EmailOtp, Exam, ExamPost, FbPost, FbSchedule, LongVideoJob, Message,
  Notice, PracticeExam, PracticeStream, PracticeSubject, PracticeTopic, Question,
  Quiz, Session, Settings, Stream, Subject, Tenant, TestSeries, Topic, TrialClaim, User,
};

export default models;
