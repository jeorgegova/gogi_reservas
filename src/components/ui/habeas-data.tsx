import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
// import { cn } from '@/lib/utils';

interface HabeasDataProps {
    onAccept: (accepted: boolean) => void;
    accepted: boolean;
}

export function HabeasData({ onAccept, accepted }: HabeasDataProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
                <div className="flex-shrink-0 mt-0.5">
                    <Shield className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="habeas-data"
                            className="text-sm text-blue-100 font-medium cursor-pointer"
                        >
                            Acepto el tratamiento de mis datos personales
                        </label>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-white/60 hover:text-white/80 flex items-center gap-1 transition-colors"
                        >
                            {isExpanded ? (
                                <>Ocultar <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>Ver más <ChevronDown className="w-3 h-3" /></>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="habeas-data"
                            checked={accepted}
                            onChange={(e) => onAccept(e.target.checked)}
                            className="w-4 h-4 rounded border-white/30 bg-white/10 text-primary focus:ring-primary/50 focus:ring-offset-0 cursor-pointer accent-primary"
                            required
                        />
                        <span className="text-xs text-white/70">
                            He leído y acepto la política de tratamiento de datos
                        </span>
                    </div>

                    {accepted && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>Aceptado</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Content - Política de Privacidad */}
            {isExpanded && (
                <Card className="bg-black/30 border-white/10 p-4 text-xs text-blue-100/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="max-h-32 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <h4 className="font-semibold text-white text-sm">POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES</h4>

                        <p className="leading-relaxed">
                            En cumplimiento de la Ley 1581 de 2012 y demás normas concordantes,
                            le informamos que los datos personales que nos proporcione serán tratados
                            de manera confidencial y utilizarse únicamente para los siguientes propósitos:
                        </p>

                        <ul className="list-disc list-inside space-y-1 ml-1">
                            <li>Gestionar su registro como usuario del sistema de reservas</li>
                            <li>Comunicarnos con usted respecto a sus reservas y eventos</li>
                            <li>Enviar notificaciones relacionadas con el servicio</li>
                            <li>Cumplir con obligaciones legales y contractuales</li>
                        </ul>

                        <p className="leading-relaxed">
                            <strong className="text-white">Derechos del titular:</strong> Usted tiene derecho a conocer,
                            actualizar, rectificar y solicitar la supresión de sus datos personales. Para ejercer
                            estos derechos, puede contactarnos a través de los canales de atención dispuestos.
                        </p>

                        <p className="leading-relaxed">
                            Al marcar la casilla anterior, usted manifiesta haber leído y acepta de manera
                            libre, voluntaria e informada el tratamiento de sus datos personales conforme a
                            la presente política.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}


export default HabeasData;
