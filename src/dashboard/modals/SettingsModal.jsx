import React from "react";
import { Modal } from "../shared/Modal.jsx";
import { ModalHeader } from "../components/ModalHeader.js";
import { Button } from "../components/Button.js";
import { Select, NumberInput, RadioButton } from "../components/FormInputs.js";
import { HelpIcon } from "../components/HelpIcon.js";
import { HELP_TEXT } from "../../shared/helpText.js";

const ProjectorSettings = ({
  aspectRatio,
  setAspectRatio,
  bgColor,
  setBgColor,
  settings,
}) => {
  return (
    <div className="flex flex-col gap-3 font-mono">
      <div className="pl-12">
        <div className="opacity-50 mb-1 text-[11px] relative inline-block">
          Aspect Ratio:
          <HelpIcon helpText={HELP_TEXT.aspectRatio} />
        </div>
        <Select
          id="aspectRatio"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          className="py-1 w-full"
        >
          {settings.aspectRatios.map((ratio) => (
            <option key={ratio.id} value={ratio.id} className="bg-[#101010]">
              {ratio.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="pl-12">
        <div className="opacity-50 mb-1 text-[11px]">Background Color:</div>
        <Select
          id="bgColor"
          value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          className="py-1 w-full"
        >
          {settings.backgroundColors.map((color) => (
            <option key={color.id} value={color.id} className="bg-[#101010]">
              {color.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export const SettingsModal = ({
  isOpen,
  onClose,
  aspectRatio,
  setAspectRatio,
  bgColor,
  setBgColor,
  settings,
  inputConfig,
  setInputConfig,
  availableMidiDevices,
  onOpenMappings,
  config,
  updateConfig,
  workspacePath,
  onSelectWorkspace,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="SETTINGS" onClose={onClose} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 font-mono border-b border-neutral-800 pb-6">
          <div className="pl-12">
            <div className="opacity-50 mb-1 text-[11px] relative inline-block">
              Signal Source:
              <HelpIcon helpText={HELP_TEXT.sequencerMode} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 py-1">
                <RadioButton
                  id="signal-external"
                  name="signalSource"
                  value="external"
                  checked={!config.sequencerMode}
                  onChange={() => updateConfig({ sequencerMode: false })}
                />
                <label
                  htmlFor="signal-external"
                  className="cursor-pointer text-[11px] font-mono text-neutral-300"
                >
                  External (MIDI/OSC)
                </label>
              </div>
              <div className="flex items-center gap-3 py-1">
                <RadioButton
                  id="signal-sequencer"
                  name="signalSource"
                  value="sequencer"
                  checked={config.sequencerMode}
                  onChange={() => updateConfig({ sequencerMode: true })}
                />
                <label
                  htmlFor="signal-sequencer"
                  className="cursor-pointer text-[11px] font-mono text-neutral-300"
                >
                  Sequencer (Pattern Grid)
                </label>
              </div>
            </div>
          </div>

          {!config.sequencerMode && (
            <>
              <div className="pl-12">
                <div className="opacity-50 mb-1 text-[11px] relative inline-block">
                  Input Source:
                  <HelpIcon helpText={HELP_TEXT.inputType} />
                </div>
                <Select
                  id="inputType"
                  value={inputConfig.type}
                  onChange={(e) =>
                    setInputConfig({ ...inputConfig, type: e.target.value })
                  }
                  className="py-1 w-full"
                >
                  <option value="midi" className="bg-[#101010]">
                    MIDI
                  </option>
                  <option value="osc" className="bg-[#101010]">
                    OSC
                  </option>
                </Select>
              </div>

              {inputConfig.type === "midi" && (
                <>
                  <div className="pl-12">
                    <div className="opacity-50 mb-1 text-[11px]">
                      MIDI Device:
                    </div>
                    <Select
                      id="midiDevice"
                      value={inputConfig.deviceName}
                      onChange={(e) =>
                        setInputConfig({
                          ...inputConfig,
                          deviceName: e.target.value,
                        })
                      }
                      className="py-1 w-full"
                    >
                      {availableMidiDevices.map((device) => (
                        <option
                          key={device.id}
                          value={device.name}
                          className="bg-[#101010]"
                        >
                          {device.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="pl-12">
                    <div className="text-[10px] opacity-50">
                      Velocity set to 127
                    </div>
                  </div>
                </>
              )}

              {inputConfig.type === "osc" && (
                <>
                  <div className="pl-12">
                    <div className="opacity-50 mb-1 text-[11px] relative inline-block">
                      OSC Port:
                      <HelpIcon helpText={HELP_TEXT.oscPort} />
                    </div>
                    <NumberInput
                      id="oscPort"
                      value={inputConfig.port}
                      onChange={(e) =>
                        setInputConfig({
                          ...inputConfig,
                          port: parseInt(e.target.value) || 8000,
                        })
                      }
                      className="py-1 w-full"
                      min={1024}
                      max={65535}
                    />
                  </div>

                  <div className="pl-12">
                    <div className="text-[10px] opacity-50">
                      Send OSC to: localhost:{inputConfig.port}
                    </div>
                  </div>
                </>
              )}

              <div className="pl-12">
                <div className="opacity-50 mb-1 text-[11px]">
                  Global Input Mappings:
                </div>
                <Button onClick={onOpenMappings} className="w-full">
                  CONFIGURE MAPPINGS
                </Button>
              </div>
            </>
          )}

          {config.sequencerMode && (
            <div className="pl-12">
              <div className="opacity-50 mb-1 text-[11px] relative inline-block">
                Sequencer BPM:
                <HelpIcon helpText={HELP_TEXT.sequencerBpm} />
              </div>
              <NumberInput
                value={config.sequencerBpm || 120}
                onChange={(e) =>
                  updateConfig({
                    sequencerBpm: parseInt(e.target.value) || 120,
                  })
                }
                step={1}
                className="py-1 w-full"
              />
            </div>
          )}
        </div>

        <ProjectorSettings
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          bgColor={bgColor}
          setBgColor={setBgColor}
          settings={settings}
        />

        <div className="flex flex-col gap-2 font-mono border-t border-neutral-800 pt-6">
          <div className="pl-12">
            <div className="opacity-50 mb-1 text-[11px]">
              Modules Workspace:
            </div>
            <div className="text-[11px] text-neutral-300/70 break-all">
              {workspacePath || "Not set"}
            </div>
          </div>
          <div className="pl-12">
            <Button onClick={onSelectWorkspace} className="w-full">
              {workspacePath ? "CHANGE WORKSPACE" : "SELECT WORKSPACE"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
