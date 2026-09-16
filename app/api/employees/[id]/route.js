import { NextResponse } from "next/server";
import { getSupabase, PHOTO_BUCKET } from "../../../../lib/supabaseAdmin";
import { rowToApi } from "../../../../lib/mapRow";

export async function GET(request, { params }) {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let signedUrl = null;
  if (row.photo_path) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(row.photo_path, 3600);
    signedUrl = signed?.signedUrl || null;
  }

  return NextResponse.json({ item: rowToApi(row, signedUrl) });
}

export async function DELETE(request, { params }) {
  const supabase = getSupabase();

  const { data: files } = await supabase.storage
    .from(PHOTO_BUCKET)
    .list(params.id);
  if (files && files.length) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(files.map((f) => `${params.id}/${f.name}`));
  }

  const { error } = await supabase
    .from("employees")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
