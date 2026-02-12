import { create } from "zustand";

export type Gender = "female" | "male" | "";
export type BlessingType = "caiyun" | "aiqing" | "jiankang" | "xueye" | "";

type State = {
  gender: Gender;
  blessingType: BlessingType;
  blessing: string;
  avatarFile: File | null;
  aiProvider: "jimeng" | "gemini";
};

type Actions = {
  setGender: (gender: Gender) => void;
  setBlessingType: (blessingType: BlessingType) => void;
  setBlessing: (blessing: string) => void;
  setAvatarFile: (file: File | null) => void;
  setAiProvider: (provider: "jimeng" | "gemini") => void;
  reset: () => void;
};

const initialState: State = {
  gender: "",
  blessingType: "",
  blessing: "",
  avatarFile: null,
  aiProvider: "jimeng",
};

export const useBlessingCardStore = create<State & Actions>((set) => ({
  ...initialState,
  setGender: (gender) => set({ gender }),
  setBlessingType: (blessingType) => set({ blessingType }),
  setBlessing: (blessing) => set({ blessing }),
  setAvatarFile: (avatarFile) => set({ avatarFile }),
  setAiProvider: (aiProvider) => set({ aiProvider }),
  reset: () => set({ ...initialState }),
}));
