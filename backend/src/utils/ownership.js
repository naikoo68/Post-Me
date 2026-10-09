import mongoose from "../db/odm.js";
// Ownership scoping for the multi-tenant "client" role.
//
// A "client" is a self-service account that only uses the My Practice section
// and can see/edit ONLY the content it created (owner === its own id). Admins
// work with the shared platform content, which has owner null (or, for records
// created before this feature, no owner field at all).
//
// Note: a Mongo query `{ owner: null }` matches documents where owner is null
// OR the field is missing — so all pre-existing content still belongs to the
// admin space automatically, no data migration required.

export const isClient = (req) => req.user?.role === "client";

// The value to stamp on newly created content.
export const ownerValue = (req) => (isClient(req) ? req.user._id : null);

// A filter fragment to scope reads/updates/deletes to the caller's space.
export const ownerFilter = (req) => (isClient(req) ? { owner: req.user._id } : { owner: null });

// The same scope for an aggregate() $match. Aggregations don't cast, so a
// string user id must become an ObjectId or it matches nothing.
export const ownerMatch = (req) => {
  if (!isClient(req)) return { owner: null };
  const id = req.user._id;
  return { owner: typeof id === "string" && /^[a-f\d]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : id };
};
