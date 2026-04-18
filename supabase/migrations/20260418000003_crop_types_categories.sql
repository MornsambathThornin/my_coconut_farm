-- Widen the crop_types.category check constraint so it accepts every
-- category our UI maps (src/lib/cropIcon.ts) plus a safe NULL.
--
-- The constraint was originally defined with a narrower set (tree / crop /
-- other) when the table was first created outside our migration tree, which
-- caused INSERTs with category = 'fruit', 'root', 'cereal' to fail.

alter table public.crop_types
  drop constraint if exists crop_types_category_check;

alter table public.crop_types
  add constraint crop_types_category_check
  check (
    category is null
    or category in ('tree', 'fruit', 'root', 'cereal', 'other')
  );
