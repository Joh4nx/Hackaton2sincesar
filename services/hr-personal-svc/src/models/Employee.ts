import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    nombreCompleto: { type: String, required: true },
    area: { type: String },
    cargo: { type: String },
    remuneracion: { type: Number, required: true, min: 0 },
    activo: { type: Boolean, default: true },
    fecha_ingreso: { type: Date, required: true },
    fecha_baja: { type: Date }
  },
  { timestamps: true }
);

export type EmployeeDoc = mongoose.InferSchemaType<typeof employeeSchema> & { _id: mongoose.Types.ObjectId };
export const Employee = mongoose.model("Employee", employeeSchema);
