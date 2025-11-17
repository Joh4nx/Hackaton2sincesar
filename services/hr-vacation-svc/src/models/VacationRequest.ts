import mongoose from "mongoose";

const vacationRequestSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    periodo: { type: Number, required: true }, // año, ej 2025
    dias: { type: Number, required: true, min: 1, max: 15 },
    estado: { type: String, enum: ["solicitado", "aprobado", "rechazado"], default: "solicitado", index: true },
  },
  { timestamps: true }
);

export type VacationRequestDoc = mongoose.InferSchemaType<typeof vacationRequestSchema> & { _id: mongoose.Types.ObjectId };
export const VacationRequest = mongoose.model("VacationRequest", vacationRequestSchema);
