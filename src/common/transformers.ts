// typescript
import { Transform } from 'class-transformer';

export const trimValue = (value: any) =>
  typeof value === 'string' ? value.trim() : value;

export const toNumberValue = (value: any) =>
  value === undefined || value === null ? undefined : Number(value);

export const Trim = () => Transform(({ value }) => trimValue(value));

export const TrimEach = () =>
  Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => (typeof v === 'string' ? v.trim() : v))
      : value,
  );

export const ToNumber = () => Transform(({ value }) => toNumberValue(value));

export const ComposeTransforms = (...fns: Array<(v: any, ctx?: any) => any>) =>
  Transform(({ value, key, obj }) =>
    fns.reduce((v, fn) => fn(v, { key, obj }), value),
  );
