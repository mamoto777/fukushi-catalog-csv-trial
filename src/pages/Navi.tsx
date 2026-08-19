import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BackButton from "../components/BackButton";
import BigButton from "../components/BigButton";
import { USER_OPTIONS, concernsForScene, MAX_CONCERNS } from "../data/questions";
import { useProducts } from "../data/ProductsContext";
import type { NaviAnswers } from "../types";

/** 困りごとナビ(3問・1問1画面。回答はメモリ上のみで保存しない) */
export default function Navi() {
  const navigate = useNavigate();
  const { vocab } = useProducts();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [user, setUser] = useState<string | null>(null);
  const [scene, setScene] = useState<string | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);

  const back = () => {
    if (step === 1) {
      navigate(-1);
    } else if (step === 2) {
      setStep(1);
    } else {
      setConcerns([]);
      setStep(2);
    }
  };

  const toggleConcern = (c: string) => {
    setConcerns((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      if (prev.length >= MAX_CONCERNS) return prev;
      return [...prev, c];
    });
  };

  const submit = () => {
    const answers: NaviAnswers = { user, scene, concerns };
    navigate("/list?from=navi", { state: answers });
  };

  return (
    <main className="page">
      <Header title={`困りごとナビ(${step}/3)`} />
      <BackButton onClick={back} label={step === 1 ? "もどる" : "前の質問にもどる"} />

      {step === 1 && (
        <section aria-labelledby="q1">
          <h2 id="q1" className="navi-question">
            どなたが使いますか?
          </h2>
          <div className="navi-options">
            {USER_OPTIONS.map((u) => (
              <BigButton
                key={u}
                onClick={() => {
                  setUser(u);
                  setStep(2);
                }}
              >
                {u}
              </BigButton>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="q2">
          <h2 id="q2" className="navi-question">
            どの場面で困っていますか?
          </h2>
          <div className="navi-options">
            {vocab.scenes.map((s) => (
              <BigButton
                key={s.label}
                onClick={() => {
                  setScene(s.label);
                  setConcerns([]);
                  setStep(3);
                }}
              >
                {s.label}
              </BigButton>
            ))}
          </div>
        </section>
      )}

      {step === 3 && scene !== null && (
        <section aria-labelledby="q3">
          <h2 id="q3" className="navi-question">
            どんなことに困っていますか?
          </h2>
          <p className="navi-hint">あてはまるものをえらんでください(最大{MAX_CONCERNS}つ)</p>
          <div className="navi-options">
            {concernsForScene(vocab.scenes, scene).map((c) => {
              const selected = concerns.includes(c);
              return (
                <BigButton
                  key={c}
                  variant="secondary"
                  selected={selected}
                  disabled={!selected && concerns.length >= MAX_CONCERNS}
                  onClick={() => toggleConcern(c)}
                >
                  {selected ? `✓ ${c}` : c}
                </BigButton>
              );
            })}
          </div>
          <div className="navi-submit">
            <BigButton onClick={submit} disabled={concerns.length === 0}>
              この条件で商品を探す
            </BigButton>
          </div>
        </section>
      )}
    </main>
  );
}
