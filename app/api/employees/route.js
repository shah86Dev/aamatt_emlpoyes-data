import { NextResponse } from "next/server";
import { getSupabase, PHOTO_BUCKET } from "../../../lib/supabaseAdmin";
import { rowToApi } from "../../../lib/mapRow";

const REQUIRED = [
  ["name", "Full Name"],
  ["fatherHusbandName", "Father's/Husband's Name"],
  ["dob", "Date of Birth"],
  ["sex", "Sex"],
  ["cnic", "CNIC #"],
  ["postAppliedFor", "Post Applied For"],
  ["department", "Department"],
  ["contactTel", "Contact Tel #"],
  ["address", "Address"],
];

export async function GET() {
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const paths = rows.filter((r) => r.photo_path).map((r) => r.photo_path);
  let signedMap = {};
  if (paths.length) {
    const { data: signedList } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(paths, 3600);
    (signedList || []).forEach((s) => {
      if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl;
    });
  }

  const items = rows.map((r) =>
    rowToApi(r, r.photo_path ? signedMap[r.photo_path] : null)
  );
  return NextResponse.json({ items });
}

export async function POST(request) {
  const supabase = getSupabase();
  const formData = await request.formData();

  const get = (k) => (formData.get(k) || "").toString().trim();
  const missing = REQUIRED.filter(([key]) => !get(key));
  if (missing.length) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: " +
          missing.map(([, label]) => label).join(", "),
      },
      { status: 400 }
    );
  }

  let education = [];
  let employment = [];
  try {
    education = JSON.parse(formData.get("education") || "[]");
    employment = JSON.parse(formData.get("employment") || "[]");
  } catch (e) {
    return NextResponse.json(
      { error: "Malformed education/employment data" },
      { status: 400 }
    );
  }

  // Reserve a sequential employee ID
  const { data: employeeId, error: idErr } = await supabase.rpc(
    "next_employee_id"
  );
  if (idErr || !employeeId) {
    return NextResponse.json(
      { error: "Could not generate employee ID: " + (idErr?.message || "") },
      { status: 500 }
    );
  }

  // Upload photo, if provided
  let photoPath = null;
  const photo = formData.get("photo");
  if (photo && typeof photo === "object" && photo.size > 0) {
    const ext = (photo.name || "photo.jpg").split(".").pop().toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    photoPath = `${employeeId}/photo.${safeExt}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, buffer, {
        contentType: photo.type || "image/jpeg",
        upsert: true,
      });
    if (uploadErr) {
      photoPath = null; // continue without failing the whole submission
    }
  }

  const insertRow = {
    id: employeeId,
    name: get("name"),
    father_husband_name: get("fatherHusbandName"),
    dob: get("dob"),
    sex: get("sex"),
    place_of_birth: get("placeOfBirth") || null,
    nationality: get("nationality") || null,
    cnic: get("cnic"),
    religion: get("religion") || null,
    marital_status: get("maritalStatus") || null,
    post_applied_for: get("postAppliedFor"),
    department: get("department"),
    salary_expected: get("salaryExpected") || null,
    joining_date: get("joiningDate") || null,
    availability: get("availability") || null,
    contact_tel: get("contactTel"),
    attendance_allowance: get("attendanceAllowance") || "No",
    address: get("address"),
    education,
    employment,
    emergency_name: get("emergencyName") || null,
    emergency_relation: get("emergencyRelation") || null,
    emergency_res_tel: get("emergencyResTel") || null,
    emergency_bus_tel: get("emergencyBusTel") || null,
    emergency_address: get("emergencyAddress") || null,
    photo_path: photoPath,
  };

  const { data: row, error: insertErr } = await supabase
    .from("employees")
    .insert(insertRow)
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  let signedUrl = null;
  if (photoPath) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(photoPath, 3600);
    signedUrl = signed?.signedUrl || null;
  }

  return NextResponse.json({ item: rowToApi(row, signedUrl) }, { status: 201 });
}
