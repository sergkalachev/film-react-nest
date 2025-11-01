import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Shedule
@Schema({ _id: false })
export class ScheduleItem {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) daytime: string;
  @Prop({ required: true }) hall: string;
  @Prop({ required: true }) rows: number;
  @Prop({ required: true }) seats: number;
  @Prop({ required: true }) price: number;
  @Prop({ type: [String], default: [] }) taken: string[];
}
export const ScheduleItemSchema = SchemaFactory.createForClass(ScheduleItem);

// Film
@Schema({ collection: 'films', versionKey: false })
export class FilmEntity {
  @Prop({ required: true, unique: true }) id: string;
  @Prop() rating?: number;
  @Prop() director?: string;
  @Prop({ type: [String], default: [] }) tags?: string[];
  @Prop() title?: string;
  @Prop() about?: string;
  @Prop() description?: string;
  @Prop() image?: string;
  @Prop() cover?: string;
  @Prop({ type: [ScheduleItemSchema], default: [] })
  schedule: ScheduleItem[];
}

export type FilmDocument = HydratedDocument<FilmEntity>;
export const FilmSchema = SchemaFactory.createForClass(FilmEntity);
